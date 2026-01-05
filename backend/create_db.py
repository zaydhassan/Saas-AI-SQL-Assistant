from db import Base, engine
from models import User, Dataset, Query  # noqa

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Done.")