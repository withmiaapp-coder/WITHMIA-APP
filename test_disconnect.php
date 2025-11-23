<?php
require_once 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$manager = new App\Services\EvolutionInstanceManager();
var_dump(method_exists($manager, 'disconnectInstance'));