$db = DB::connection("chatwoot");
$deleted = $db->table("messages")->where("content", "LIKE", "%Connection successfully%")->delete();
echo "Deleted: " . $deleted;
