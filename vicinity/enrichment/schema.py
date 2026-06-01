"""
Business contracts. Bumping schema_version / prompt_version = ADR required (see DECISIONS.md §5).
"""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True)


class GeoData(FrozenModel):
    address: str
    lat: float
    lng: float
    zip: str
    city: str
    state: str


class Demographics(FrozenModel):
    population: int | None = None
    median_income: int | None = None
    median_age: float | None = None
    asian_pct: float | None = None
    chinese_pct: float | None = None
    college_degree_pct: float | None = None


class Scores(FrozenModel):
    walk: int | None = None
    transit: int | None = None
    bike: int | None = None


class Poi(FrozenModel):
    name: str
    address: str
    distance_m: float
    rating: float | None = None


class Pois(FrozenModel):
    schools: list[Poi] = []
    grocery: list[Poi] = []
    asian_grocery: list[Poi] = []
    restaurants: list[Poi] = []
    chinese_schools: list[Poi] = []


class NeighborhoodData(FrozenModel):
    schema_version: Literal["v1"] = "v1"
    geo: GeoData
    demographics: Demographics
    scores: Scores
    pois: Pois
    errors: dict[str, str] = {}  # provider → error msg


class GeneratedContent(FrozenModel):
    prompt_version: Literal["v1"] = "v1"
    model: str  # e.g. "claude-sonnet-4-5-20250929"
    sections: dict[str, Any]  # headline / neighborhood_story / schools / commute / chinese_community
    generated_at: datetime
    token_usage: dict[str, int]  # {input, output, total}
