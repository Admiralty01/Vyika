import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.core.audit import log_audit_event
from app.models.models import Product, ProductStatus, User
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.modules.auth.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=list[ProductResponse])
async def list_products(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product)
    
    # Regular users can ONLY see ACTIVE products
    if current_user.role != "ADMIN":
        stmt = stmt.where(Product.status == ProductStatus.ACTIVE)
    elif status_filter:
        try:
            p_status = ProductStatus(status_filter.upper())
            stmt = stmt.where(Product.status == p_status)
        except ValueError:
            pass

    stmt = stmt.order_by(Product.created_at.desc())
    result = await db.execute(stmt)
    products = result.scalars().all()
    return [ProductResponse.model_validate(p) for p in products]

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).where(Product.id == product_id)
    product = (await db.execute(stmt)).scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if current_user.role != "ADMIN" and product.status != ProductStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive.")

    return ProductResponse.model_validate(product)

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    prod_in: ProductCreate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    product = Product(
        name=prod_in.name.strip(),
        description=prod_in.description.strip(),
        image_url=prod_in.image_url,
        price_usd=prod_in.price_usd,
        commission_type=prod_in.commission_type,
        commission_value=prod_in.commission_value,
        status=prod_in.status
    )
    db.add(product)
    await db.flush()

    await log_audit_event(
        db=db,
        action="PRODUCT_CREATED",
        resource="Product",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=product.id,
        ip_address=request.client.host if request.client else None,
        metadata={"name": product.name, "price_usd": str(product.price_usd)}
    )
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)

@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    prod_in: ProductUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).where(Product.id == product_id)
    product = (await db.execute(stmt)).scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    update_data = prod_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(product, field, value)

    await log_audit_event(
        db=db,
        action="PRODUCT_UPDATED",
        resource="Product",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=product.id,
        ip_address=request.client.host if request.client else None,
        metadata={"updated_fields": list(update_data.keys())}
    )
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)

@router.delete("/{product_id}", response_model=ProductResponse)
async def archive_product(
    product_id: str,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).where(Product.id == product_id)
    product = (await db.execute(stmt)).scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.status = ProductStatus.ARCHIVED

    await log_audit_event(
        db=db,
        action="PRODUCT_ARCHIVED",
        resource="Product",
        actor_id=admin.id,
        actor_email=admin.email,
        resource_id=product.id,
        ip_address=request.client.host if request.client else None
    )
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)

@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin)
):
    # Validate Extension
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Read content to validate size & image binary format
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB"
        )

    # Generate random safe filename
    random_filename = f"prod_{uuid.uuid4().hex}{file_ext}"
    dest_path = settings.UPLOAD_DIR / random_filename

    with open(dest_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/{random_filename}"
    return {"image_url": image_url}
