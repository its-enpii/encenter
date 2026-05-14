<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

class EncryptionService
{
    /**
     * Encrypt a value.
     */
    public function encrypt(mixed $value): string
    {
        if (empty($value)) {
            return '';
        }
        
        return Crypt::encrypt($value);
    }

    /**
     * Decrypt a value.
     */
    public function decrypt(string $payload): mixed
    {
        if (empty($payload)) {
            return '';
        }

        try {
            return Crypt::decrypt($payload);
        } catch (\Exception $e) {
            return '[DECRYPTION_ERROR]';
        }
    }
}
