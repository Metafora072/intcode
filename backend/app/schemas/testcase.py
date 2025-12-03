from pydantic import BaseModel


class TestCaseBase(BaseModel):
    id: int | None = None
    input_text: str
    output_text: str
    is_sample: bool = False

    class Config:
        from_attributes = True


class TestCaseCreate(BaseModel):
    input_text: str
    output_text: str
    is_sample: bool = False
