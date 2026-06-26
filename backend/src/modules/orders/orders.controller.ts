import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Post('checkout')
  checkout(@Body() body: any) {
    return this.service.create(body);
  }

  @Get('my')
  myOrders(
    @Query('user_id') userId?: string,
    @Query('email') email?: string,
  ) {
    return this.service.myOrders({
      userId,
      email,
    });
  }

  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.service.track(orderNumber);
  }

  @Get('backoffice/options')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'point_of_sale')
  backofficeOptions(
    @Req() req: any,
    @Query('stock_source_type')
    stockSourceType?: string,
    @Query('point_of_sale_id')
    pointOfSaleId?: string,
  ) {
    return this.service.backofficeOptions(
      req.user,
      {
        stock_source_type:
          stockSourceType,
        point_of_sale_id:
          pointOfSaleId,
      },
    );
  }

  @Post('backoffice')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'point_of_sale')
  createBackoffice(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.createBackoffice(
      body,
      req.user,
    );
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'point_of_sale')
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'point_of_sale')
  updateStatus(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.updateStatus(
      Number(id),
      body,
      req.user,
    );
  }
}