from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    global_score = Column(Float, default=0.0)
    questions_answered = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("VideoSession", back_populates="user")
    masteries = relationship("ConceptMastery", back_populates="user")
    weak_points = relationship("WeakConcept", back_populates="user")
    responses = relationship("ResponseLog", back_populates="user")

class VideoSession(Base):
    __tablename__ = "video_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(String, index=True, nullable=False) # YouTube Video ID
    video_title = Column(String, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    watch_time_seconds = Column(Integer, default=0)
    focus_score = Column(Float, default=100.0)
    engagement_score = Column(Float, default=100.0)
    retention_estimate = Column(Float, default=50.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")

class ConceptMastery(Base):
    __tablename__ = "concept_mastery"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    concept_name = Column(String, index=True, nullable=False)
    mastery_percentage = Column(Float, default=0.0)
    attempts_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="masteries")

class WeakConcept(Base):
    __tablename__ = "weak_concepts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(String, nullable=False)
    concept_name = Column(String, nullable=False)
    timestamp_seconds = Column(Integer, nullable=False) # Exact lecture mark
    explanation_excerpt = Column(String, nullable=True)
    revisions_count = Column(Integer, default=0)
    last_incorrect_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weak_points")

class ResponseLog(Base):
    __tablename__ = "response_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(String, nullable=False)
    concept_name = Column(String, nullable=False)
    question_format = Column(String, nullable=False) # mcq, conceptual, numerical, ar, pyq
    user_answer = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    response_latency_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="responses")
