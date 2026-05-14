<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        \App\Models\User::create([
            'name' => 'Admin EnCenter',
            'email' => 'admin@encenter.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'phone_number' => '628123456789',
            'is_active' => true,
        ]);
    }
}
