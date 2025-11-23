<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class ListUsers extends Command
{
    protected $signature = 'users:list';
    protected $description = 'Lista todos los usuarios';

    public function handle()
    {
        $users = User::all();
        $this->info("Total usuarios: " . $users->count());
        
        foreach ($users as $user) {
            $this->info("ID: {$user->id} - {$user->name} - {$user->email}");
        }
    }
}