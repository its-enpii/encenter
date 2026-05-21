FROM php:8.3-apache

# Install system deps + PHP extensions required by phpMyAdmin
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install mysqli mbstring zip xml \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Allow .htaccess overrides
RUN sed -i 's|AllowOverride None|AllowOverride All|g' /etc/apache2/apache2.conf

# Disable opcache so file changes take effect immediately
RUN echo "opcache.enable=0" > /usr/local/etc/php/conf.d/disable-opcache.ini