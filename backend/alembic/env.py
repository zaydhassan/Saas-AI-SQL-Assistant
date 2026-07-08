"""Alembic environment.

Wired to the project's declarative Base metadata and DATABASE_URL (loaded from
.env via db.py). We feed the engine directly from DATABASE_URL instead of
pushing the URL through alembic.ini's configparser, because passwords may
contain '%' (e.g. URL-encoded '@' as %40) which configparser would try to
interpolate. Migrations are hand-written and additive.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool, create_engine

import db  # noqa: E402  - ensures load_dotenv() + DATABASE_URL are available
from db import Base, DATABASE_URL  # noqa: E402
import models  # noqa: F401,E402  - registers all ORM tables on Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=False,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=False,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()