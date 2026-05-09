<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProfileService
{
    public function store(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $validated = $this->validateStore($data);

            if ($user->profile()->exists()) {
                throw new ConflictHttpException('User already completed onboarding.');
            }

            $user->profile()->create($validated);
            $user->update(['status' => User::STATUS_ACTIVE]);

            return $user->fresh()->load('profile');
        });
    }

    public function show(User $user): UserProfile
    {
        return $user->profile()->firstOr(function (): never {
            throw new NotFoundHttpException('Profile not found.');
        });
    }

    public function update(User $user, array $data): UserProfile
    {
        return DB::transaction(function () use ($user, $data) {
            $profile = $user->profile()->firstOr(function (): never {
                throw new NotFoundHttpException('Profile not found.');
            });

            $validated = $this->validateUpdate($data);

            $profile->fill($validated);
            $profile->save();

            return $profile->fresh();
        });
    }

    private function validateStore(array $data): array
    {
        return Validator::make($data, $this->profileRules(true))->validate();
    }

    private function validateUpdate(array $data): array
    {
        return Validator::make($data, $this->profileRules(false))->validate();
    }

    private function profileRules(bool $required): array
    {
        $presence = $required ? ['required'] : ['sometimes'];

        return [
            'major' => [...$presence, 'string', 'max:255'],
            'semester' => [...$presence, 'integer', 'min:1', 'max:14'],
            'language_preference' => [...$presence, 'string', 'in:id,en'],
            'learning_style' => [...$presence, 'string', 'in:visual,auditory,kinesthetic'],
        ];
    }
}
