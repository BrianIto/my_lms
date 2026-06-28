-- Course catalog: normalized courses, modules, lessons, and in-video sequence bookmarks.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'beta', 'published')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  youtube_embed_url text NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_sequence_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  timestamp_seconds integer NOT NULL CHECK (timestamp_seconds >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_status_sort ON courses (status, sort_order);
CREATE INDEX IF NOT EXISTS idx_modules_course_sort ON modules (course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_module_sort ON lessons (module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sequence_lesson_sort ON lesson_sequence_points (lesson_id, sort_order, timestamp_seconds);

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_modules_updated_at ON modules;
CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lessons_updated_at ON lessons;
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_sequence_updated_at ON lesson_sequence_points;
CREATE TRIGGER trg_sequence_updated_at BEFORE UPDATE ON lesson_sequence_points
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the initial course so existing catalog/dashboard/player screens keep working.
DO $$
DECLARE
  v_course_id uuid;
  v_mod1 uuid;
  v_mod2 uuid;
  v_lesson_loop uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM courses WHERE slug = 'building-with-ai') THEN
    RETURN;
  END IF;

  INSERT INTO courses (slug, title, description, status, sort_order)
  VALUES (
    'building-with-ai',
    'Building with AI',
    'A precise course on turning model capabilities into durable product workflows, shipped in small useful increments.',
    'beta',
    10
  )
  RETURNING id INTO v_course_id;

  INSERT INTO modules (course_id, title, sort_order)
  VALUES (v_course_id, 'Orientation', 1) RETURNING id INTO v_mod1;

  INSERT INTO modules (course_id, title, sort_order)
  VALUES (v_course_id, 'Designing the learning loop', 2) RETURNING id INTO v_mod2;

  INSERT INTO lessons (module_id, title, youtube_embed_url, duration_seconds, sort_order) VALUES
    (v_mod1, 'Welcome and operating principles', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 420, 1),
    (v_mod1, 'Course stack and project constraints', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 690, 2);

  INSERT INTO lessons (module_id, title, youtube_embed_url, duration_seconds, sort_order)
  VALUES (v_mod2, 'From passive video to tracked knowledge', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 840, 1)
  RETURNING id INTO v_lesson_loop;

  INSERT INTO lessons (module_id, title, youtube_embed_url, duration_seconds, sort_order)
  VALUES (v_mod2, 'Caching static content without leaking progress', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 780, 2);

  INSERT INTO lesson_sequence_points (lesson_id, title, description, timestamp_seconds, sort_order) VALUES
    (v_lesson_loop, 'Setup the mental model', 'What to pay attention to in this section.', 0, 1),
    (v_lesson_loop, 'Implementation checkpoint', 'Pause here and compare the code shape.', 185, 2);
END $$;
