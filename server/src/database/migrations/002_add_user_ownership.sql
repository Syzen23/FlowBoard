ALTER TABLE canvases
    ADD COLUMN owner_id TEXT NOT NULL;

ALTER TABLE tasks
    ADD COLUMN owner_id TEXT NOT NULL;

CREATE INDEX canvases_owner_id_idx
    ON canvases(owner_id);

CREATE INDEX tasks_owner_id_idx
    ON tasks(owner_id);
