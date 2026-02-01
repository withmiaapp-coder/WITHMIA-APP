-- Ver estructura de Message
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Message' 
ORDER BY ordinal_position;
