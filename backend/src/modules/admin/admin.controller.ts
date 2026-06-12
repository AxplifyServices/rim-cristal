import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('points-of-sale')
  listPointsOfSale() {
    return this.service.listPointsOfSale();
  }

  @Post('points-of-sale')
  createPointOfSale(@Body() body: any) {
    return this.service.createPointOfSale(body);
  }

  @Put('points-of-sale/:id')
  updatePointOfSale(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePointOfSale(Number(id), body);
  }

  @Delete('points-of-sale/:id')
  deletePointOfSale(@Param('id') id: string) {
    return this.service.deletePointOfSale(Number(id));
  }

  @Get('points-of-sale/:id/stock')
  pointOfSaleStock(@Param('id') id: string) {
    return this.service.pointOfSaleStock(Number(id));
  }

  @Post('stock/transfer-global-to-pos')
  transferGlobalStockToPointOfSale(@Body() body: any) {
    return this.service.transferGlobalStockToPointOfSale(body);
  }

  @Post('stock/adjust-global')
  adjustGlobalStock(@Body() body: any) {
    return this.service.adjustGlobalStock(body);
  }

  @Post('stock/adjust-pos')
  adjustPointOfSaleStock(@Body() body: any) {
    return this.service.adjustPointOfSaleStock(body);
  }

  @Get('stock/movements')
  listStockMovements(@Query() query: any) {
    return this.service.listStockMovements(query);
  }

  @Post('points-of-sale/:id/sales')
  createPointOfSaleSale(@Param('id') id: string, @Body() body: any) {
    return this.service.createPointOfSaleSale(Number(id), body);
  }

  @Get('sales')
  listPointOfSaleSales(@Query() query: any) {
    return this.service.listPointOfSaleSales(query);
  }
}