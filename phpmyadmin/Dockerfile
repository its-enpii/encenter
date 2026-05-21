FROM php:8.3-apache

# Install system deps + PHP extensions required by phpMyAdmin
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install mysqli mbstring zip xml \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite + allow .htaccess overrides
RUN a2enmod rewrite \
    && sed -i 's|AllowOverride None|AllowOverride All|g' /etc/apache2/apache2.conf

# Disable opcache so file changes take effect immediately during dev
RUN echo "opcache.enable=0" > /usr/local/etc/php/conf.d/disable-opcache.ini

# Custom entrypoint: ensure tmp dir is writable at runtime (after volume mount)
RUN echo '#!/bin/bash\n\
mkdir -p /var/www/html/tmp\n\
chown -R www-data:www-data /var/www/html/tmp\n\
chmod -R 775 /var/www/html/tmp\n\
exec apache2-foreground "$@"' > /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]