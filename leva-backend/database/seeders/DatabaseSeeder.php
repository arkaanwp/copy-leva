<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ScrapedToolsSeeder::class, // tools AI dari theresanaiforthat.com (dummy)
            DemoUserSeeder::class,     // 1 user demo + profil + task + bookmark + chat
        ]);
    }
}
