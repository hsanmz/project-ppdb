from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import audit_log, get_db
from src.core.dependencies import require_superadmin
from src.modules.roles.schemas import RoleCreate, RoleUpdate
from src.repositories.roles_repository import RolesRepository
from src.services.roles_service import RolesService

router = APIRouter()


def get_roles_service(db: Session = Depends(get_db)) -> RolesService:
    repo = RolesRepository(db)
    return RolesService(repo)


@router.get("/")
def get_roles(
    user: dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service),
):
    return service.get_roles()


@router.get("/{id}")
def get_role(
    id: str,
    user: dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service),
):
    return service.get_role(id)


@router.post("/", status_code=201)
def create_role(
    body: RoleCreate,
    user: dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service),
):
    data = body.model_dump(exclude_unset=True)
    res = service.create_role(data)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="create",
        entity_type="roles",
        entity_id=res.get("id"),
        changes={"name": res.get("name")},
    )
    return res


@router.put("/{id}")
def update_role(
    id: str,
    body: RoleUpdate,
    user: dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service),
):
    data = body.model_dump(exclude_unset=True)
    res = service.update_role(id, data)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="update",
        entity_type="roles",
        entity_id=id,
        changes=data,
    )
    return res


@router.delete("/{id}")
def delete_role(
    id: str,
    user: dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service),
):
    service.delete_role(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="delete",
        entity_type="roles",
        entity_id=id,
    )
    return {"message": "Deleted"}
