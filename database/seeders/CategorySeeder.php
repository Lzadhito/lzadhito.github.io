<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Sample categories to seed the table
        $categories = [
            [
                'name' => 'Life',
                'published' => true,
            ],
            [
                'name' => 'Software Engineering',
                'published' => true,
            ],
            [
                'name' => 'Islam',
                'published' => false,
            ],
        ];

        // Insert categories into the database
        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
