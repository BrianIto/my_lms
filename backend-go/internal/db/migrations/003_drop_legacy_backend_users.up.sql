DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'id'
        AND data_type = 'uuid'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'email'
        AND data_type = 'text'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'created_at'
        AND data_type = 'timestamp with time zone'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name NOT IN ('id', 'email', 'created_at')
    )
  THEN
    DROP TABLE public.users;
  END IF;
END $$;
