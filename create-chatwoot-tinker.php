DB::statement("CREATE DATABASE IF NOT EXISTS chatwoot");
DB::select("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
