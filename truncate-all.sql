-- Truncar todas las tablas manteniendo la estructura
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Deshabilitar temporalmente las restricciones de foreign key
    EXECUTE 'SET session_replication_role = replica';
    
    -- Truncar todas las tablas excepto migrations
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations') 
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Truncated table: %', r.tablename;
    END LOOP;
    
    -- Rehabilitar las restricciones
    EXECUTE 'SET session_replication_role = DEFAULT';
END $$;
