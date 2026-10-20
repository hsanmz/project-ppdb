from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str | None = None
    email: str | None = None
    phone: str | None = None
    full_name: str | None = None
    role_id: str | None = None
    user_type: str | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    email: str | None = None
    phone: str | None = None
    full_name: str | None = None
    role_id: str | None = None
    user_type: str | None = None
    is_active: bool | int | None = None


class PagePermissionItem(BaseModel):
    page_id: str
    can_crud: bool = True


class PagePermissionsUpdate(BaseModel):
    page_ids: list[str] | None = None
    permissions: list[PagePermissionItem] | None = None
