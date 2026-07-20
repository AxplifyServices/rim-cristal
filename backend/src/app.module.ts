import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { HomepageBrochuresModule } from './modules/homepage-brochures/homepage-brochures.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PointOfSaleModule } from './modules/point-of-sale/point-of-sale.module';
import { ProductsModule } from './modules/products/products.module';
import { StorageModule } from './modules/storage/storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { MediaProcessingModule } from './modules/media-processing/media-processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    StorageModule,

    ProductsModule,
    AuthModule,
    OrdersModule,
    CouponsModule,
    AdminModule,
    PointOfSaleModule,
    ContactsModule,
    HomepageBrochuresModule,
    MediaProcessingModule,
  ],
})
export class AppModule {}