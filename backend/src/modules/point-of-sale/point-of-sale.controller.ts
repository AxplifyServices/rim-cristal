import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard';
import { PointOfSaleService } from './point-of-sale.service';

@UseGuards(AuthGuard)
@Controller('point-of-sale')
export class PointOfSaleController {
  constructor(private readonly service: PointOfSaleService) {}

  @Get('products')
  products(@Req() req: any) {
    return this.service.products(req.user);
  }

  @Get('sales')
  sales(@Req() req: any) {
    return this.service.sales(req.user);
  }

  @Post('sales')
  createSale(@Req() req: any, @Body() body: any) {
    return this.service.createSale(req.user, body);
  }

  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.service.dashboard(req.user);
  }
}