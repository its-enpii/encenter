<?php
declare(strict_types=1);

$cfg['blowfish_secret'] = 'encenter-pma-32char-secret-key!!';
$cfg['AllowArbitraryServer'] = true;

$cfg['Servers'][1]['auth_type']       = 'cookie';
$cfg['Servers'][1]['host']            = 'localhost';
$cfg['Servers'][1]['compress']        = false;
$cfg['Servers'][1]['AllowNoPassword'] = false;

$cfg['UploadDir'] = '';
$cfg['SaveDir']   = '';