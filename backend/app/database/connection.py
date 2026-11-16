from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.utils.config import settings

# SQLite connection args
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models.history import TranslationHistory  # noqa
    Base.metadata.create_all(bind=engine)
    # Ensure subtitled_video_path column exists in existing SQLite DB
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE translation_history ADD COLUMN subtitled_video_path VARCHAR(500)"))
            conn.commit()
    except Exception:
        # Column already exists or table freshly created
        pass
