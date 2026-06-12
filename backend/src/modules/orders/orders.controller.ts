import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  myOrders(@Query('user_id') userId?: string, @Query('email') email?: string) {
    return this.service.myOrders({ userId, email });
  }

  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.service.track(orderNumber);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateStatus(Number(id), body.status);
  }
}