---
name: api-design
description: >
  Design and build FastAPI endpoints following the established patterns
  for the UPSC IAS Prep app.
---

FastAPI endpoint pattern for this project:

Every endpoint must:
1. Use `current_user: User = Depends(get_current_user)` for auth
2. Use `db: AsyncSession = Depends(get_db)` for database access
3. Define Pydantic v2 request and response schemas before writing the handler
4. Filter all queries by `user_id = current_user.id` — never trust user_id from input
5. Return the Pydantic response schema, not raw ORM objects

Example pattern:
```python
# schemas/quiz.py
class QuizSessionCreate(BaseModel):
    topic: str
    difficulty: Literal["easy", "medium", "hard"]

class QuizSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic: str
    score: int
    xp_earned: int
    created_at: datetime

# api/quiz.py
@router.post("/sessions", response_model=QuizSessionResponse)
async def create_quiz_session(
    payload: QuizSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = QuizSession(user_id=current_user.id, **payload.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session
```

Admin endpoints additionally require role check:
```python
if current_user.role not in ["checker", "superadmin"]:
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```
