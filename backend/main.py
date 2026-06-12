import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from .db import engine, Base, get_db
from . import models

# Automatic database tables generation on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ActiveLearn AI Cognitive Backend",
    description="Cognitive learning layers, Attention analytics synchronization, and Dynamic active recall segmentation.",
    version="1.0.0"
)

# CORS configuration to allow Chrome Extension injection fetches from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for inputs
class VideoMetadata(BaseModel):
    video_id: str
    video_title: str
    duration_seconds: int

class SessionSync(BaseModel):
    user_id: int
    video_id: str
    video_title: str
    duration_seconds: int
    watch_time_seconds: int
    focus_score: float
    engagement_score: float
    retention_estimate: float

class ResponseLogInput(BaseModel):
    user_id: int
    video_id: str
    concept_name: str
    question_format: str
    user_answer: str
    is_correct: bool
    latency_seconds: Optional[float] = None

# 1. API Root Endpoint
@app.get("/")
def read_root():
    return {
        "status": "online",
        "engine": "ActiveLearn AI Cognitive Engine",
        "timestamp": datetime.utcnow()
    }

# 2. Endpoint: Transcript Segmentation & Semantic Chunking
@app.post("/api/segment-transcript")
def segment_transcript(metadata: VideoMetadata):
    title = metadata.video_title.lower()
    dur = metadata.duration_seconds
    
    # NLP Heuristic segmentation based on video topics
    if "javascript" in title or " js " in title:
        chunks = [
            {"id": 1, "title": "Execution Context & Scope Chains", "start": 0, "end": int(dur * 0.3), "desc": "Understanding lexical binding contexts, global scopes, and variable chains.", "weightage": "High Weightage"},
            {"id": 2, "title": "Closures & Temporal Dead Zone (TDZ)", "start": int(dur * 0.3), "end": int(dur * 0.65), "desc": "Analysing variable hoist TDZ, nested functional states, and garbage collection.", "weightage": "Extremely High Weightage"},
            {"id": 3, "title": "Asynchronous Event Loop Mechanics", "start": int(dur * 0.65), "end": dur, "desc": "Understanding the V8 engine microtask queue, macrotask ticks, and paint cycles.", "weightage": "High Weightage"}
        ]
    elif "python" in title:
        chunks = [
            {"id": 1, "title": "Memory Mutability & Collections", "start": 0, "end": int(dur * 0.3), "desc": "Analyzing mutable lists vs immutable tuples and V8/Python reference counters.", "weightage": "Medium Weightage"},
            {"id": 2, "title": "Generator performance & Decorators", "start": int(dur * 0.3), "end": int(dur * 0.65), "desc": "Lazy dynamic iterator streams and metadata wrapper functional decorators.", "weightage": "High Weightage"},
            {"id": 3, "title": "Global Interpreter Lock (GIL) and Threads", "start": int(dur * 0.65), "end": dur, "desc": "Understanding bytecode mutex locks and multi-processes solutions.", "weightage": "Extremely High Weightage"}
        ]
    else:
        chunks = [
            {"id": 1, "title": "Introduction & Concept Definitions", "start": 0, "end": int(dur * 0.3), "desc": "Analyzing the historical scope, basic terminology, and core axioms.", "weightage": "Medium Weightage"},
            {"id": 2, "title": "Practical Methods & Logical Blueprint", "start": int(dur * 0.3), "end": int(dur * 0.65), "desc": "Detailed walk-through, problem metrics, and core algorithms.", "weightage": "High Weightage"},
            {"id": 3, "title": "Exam Review & Systems Integration", "start": int(dur * 0.65), "end": dur, "desc": "Competitive exams tips, probable weightage checks, and summary checklists.", "weightage": "Extremely High Weightage"}
        ]
    
    return {
        "success": True,
        "video_id": metadata.video_id,
        "topic": "Computer Science & Systems",
        "chunks": chunks
    }

# 3. Endpoint: Sync Active Analytics Session
@app.post("/api/sync-session")
def sync_session(sync: SessionSync, db: Session = Depends(get_db)):
    # Verify/Create User first for simplified demo
    db_user = db.query(models.User).filter(models.User.id == sync.user_id).first()
    if not db_user:
        db_user = models.User(
            id=sync.user_id,
            username=f"student_{sync.user_id}",
            email=f"student_{sync.user_id}@activelearn.edu"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    # Log/Update VideoSession details
    db_session = db.query(models.VideoSession).filter(
        models.VideoSession.user_id == sync.user_id,
        models.VideoSession.video_id == sync.video_id
    ).first()

    if not db_session:
        db_session = models.VideoSession(
            user_id=sync.user_id,
            video_id=sync.video_id,
            video_title=sync.video_title,
            duration_seconds=sync.duration_seconds
        )
        db.add(db_session)
    
    db_session.watch_time_seconds = sync.watch_time_seconds
    db_session.focus_score = sync.focus_score
    db_session.engagement_score = sync.engagement_score
    db_session.retention_estimate = sync.retention_estimate
    db_session.created_at = datetime.utcnow()

    db.commit()
    
    return {
        "success": True,
        "focus_score": sync.focus_score,
        "engagement_score": sync.engagement_score,
        "retention_estimate": sync.retention_estimate
    }

# 4. Endpoint: Log Recall Question Answers
@app.post("/api/log-response")
def log_response(log: ResponseLogInput, db: Session = Depends(get_db)):
    # Ingest Response Log
    db_log = models.ResponseLog(
        user_id=log.user_id,
        video_id=log.video_id,
        concept_name=log.concept_name,
        question_format=log.question_format,
        user_answer=log.user_answer,
        is_correct=log.is_correct,
        response_latency_seconds=log.latency_seconds
    )
    db.add(db_log)

    # Sync User global metrics
    db_user = db.query(models.User).filter(models.User.id == log.user_id).first()
    if db_user:
        db_user.questions_answered += 1
        if log.is_correct:
            db_user.global_score += 1.0
            db_user.current_streak += 1
        else:
            db_user.current_streak = 0
            
            # Record failed concepts into weak concepts revision list
            db_weak = db.query(models.WeakConcept).filter(
                models.WeakConcept.user_id == log.user_id,
                models.WeakConcept.concept_name == log.concept_name
            ).first()

            if not db_weak:
                db_weak = models.WeakConcept(
                    user_id=log.user_id,
                    video_id=log.video_id,
                    concept_name=log.concept_name,
                    timestamp_seconds=120, # mock timestamp for demo
                    explanation_excerpt="Focus on core closure variables and environment records."
                )
                db.add(db_weak)
            db_weak.revisions_count += 1
            db_weak.last_incorrect_date = datetime.utcnow()

    # Sync Concept Mastery metrics
    db_mastery = db.query(models.ConceptMastery).filter(
        models.ConceptMastery.user_id == log.user_id,
        models.ConceptMastery.concept_name == log.concept_name
    ).first()

    if not db_mastery:
        db_mastery = models.ConceptMastery(
            user_id=log.user_id,
            concept_name=log.concept_name
        )
        db.add(db_mastery)

    db_mastery.attempts_count += 1
    if log.is_correct:
        db_mastery.success_count += 1
        
        # If successfully answered, check and resolve weak concept timeline entry
        db_weak = db.query(models.WeakConcept).filter(
            models.WeakConcept.user_id == log.user_id,
            models.WeakConcept.concept_name == log.concept_name
        ).first()
        if db_weak:
            db.delete(db_weak) # Resolved memory block!

    db_mastery.mastery_percentage = (db_mastery.success_count / db_mastery.attempts_count) * 100
    db_mastery.last_updated = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "is_correct": log.is_correct,
        "mastery_percentage": db_mastery.mastery_percentage,
        "current_streak": db_user.current_streak if db_user else 0
    }

# 5. Endpoint: Get Spaced Revisions Timelines
@app.get("/api/revisions/{user_id}")
def get_spaced_revisions(user_id: int, db: Session = Depends(get_db)):
    weak_points = db.query(models.WeakConcept).filter(
        models.WeakConcept.user_id == user_id
    ).all()
    
    return {
        "success": True,
        "weak_points": [
            {
                "id": w.id,
                "video_id": w.video_id,
                "concept_name": w.concept_name,
                "timestamp": w.timestamp_seconds,
                "revisions": w.revisions_count,
                "last_incorrect": w.last_incorrect_date
            }
            for w in weak_points
        ]
    }
