import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PointOfSaleController } from './point-of-sale.controller';
import { PointOfSaleService } from './point-of-sale.service';

@Module({
  imports: [AuthModule],
  controllers: [PointOfSaleController],
  providers: [PointOfSaleService],
})
export class PointOfSaleModule {}