<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Laksamana Adhito',
            'email' => 'lzadhito@gmail.com',
            'password' => Hash::make('d0n4t.kentang!'),
        ]);
    }
}
