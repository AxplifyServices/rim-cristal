import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  @Roles('admin', 'point_of_sale')
  stats(@Req() req: any, @Query() query: any) {
    return this.service.stats(req.user, query);
  }

  @Get('dashboard-filters')
  @Roles('admin', 'point_of_sale')
  dashboardFilters(@Req() req: any) {
    return this.service.dashboardFilters(req.user);
  }

  @Get('dashboard-stock')
  @Roles('admin', 'point_of_sale')
  dashboardStock(@Req() req: any, @Query() query: any) {
    return this.service.dashboardStock(req.user, query);
  }

  @Get('points-of-sale')
  @Roles('admin')
  listPointsOfSale() {
    return this.service.listPointsOfSale();
  }

  @Post('points-of-sale')
  @Roles('admin')
  createPointOfSale(@Body() body: any) {
    return this.service.createPointOfSale(body);
  }

  @Put('points-of-sale/:id')
  @Roles('admin')
  updatePointOfSale(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePointOfSale(Number(id), body);
  }

  @Delete('points-of-sale/:id')
  @Roles('admin')
  deletePointOfSale(@Param('id') id: string) {
    return this.service.deletePointOfSale(Number(id));
  }

  @Get('points-of-sale/:id/stock')
  @Roles('admin')
  pointOfSaleStock(@Param('id') id: string) {
    return this.service.pointOfSaleStock(Number(id));
  }

  @Post('stock/transfer-global-to-pos')
  @Roles('admin')
  transferGlobalStockToPointOfSale(@Body() body: any) {
    return this.service.transferGlobalStockToPointOfSale(body);
  }

  @Post('stock/adjust-global')
  @Roles('admin')
  adjustGlobalStock(@Body() body: any) {
    return this.service.adjustGlobalStock(body);
  }

  @Post('stock/adjust-pos')
  @Roles('admin')
  adjustPointOfSaleStock(@Body() body: any) {
    return this.service.adjustPointOfSaleStock(body);
  }

  @Get('stock/movements')
  @Roles('admin')
  listStockMovements(@Query() query: any) {
    return this.service.listStockMovements(query);
  }

  @Post('points-of-sale/:id/sales')
  @Roles('admin')
  createPointOfSaleSale(@Param('id') id: string, @Body() body: any) {
    return this.service.createPointOfSaleSale(Number(id), body);
  }

  @Get('sales')
  @Roles('admin', 'point_of_sale')
  listPointOfSaleSales(@Req() req: any, @Query() query: any) {
    return this.service.listPointOfSaleSales(query, req.user);
  }
}