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

import { AuthGuard } from '../../common/auth/auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly service: ReviewsService,
  ) {}

  /**
   * Avis sélectionnés par l'admin pour la home.
   * Route publique.
   */
  @Get('home')
  getHomeReviews() {
    return this.service.getHomeReviews();
  }

  /**
   * Vérifie qu'un jeton de commande permet encore
   * le dépôt d'un avis.
   */
  @Get('invitation/:token')
  getInvitation(
    @Param('token') token: string,
  ) {
    return this.service.getInvitation(
      token,
    );
  }

  /**
   * Dépôt public après une commande.
   */
  @Post()
  create(
    @Body() body: any,
  ) {
    return this.service.create(
      body,
    );
  }

  /**
   * Liste de modération réservée aux administrateurs.
   */
  @Get()
  @UseGuards(
    AuthGuard,
    RolesGuard,
  )
  @Roles('admin')
  findAll(
    @Query('status')
    status?: string,
  ) {
    return this.service.findAll({
      status,
    });
  }

  /**
   * Approbation ou rejet.
   */
  @Patch(':id/moderation')
  @UseGuards(
    AuthGuard,
    RolesGuard,
  )
  @Roles('admin')
  updateModeration(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateModeration(
      Number(id),
      body,
    );
  }

  /**
   * Sélection pour la home.
   */
  @Patch(':id/home')
  @UseGuards(
    AuthGuard,
    RolesGuard,
  )
  @Roles('admin')
  updateHomeVisibility(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateHomeVisibility(
      Number(id),
      body,
    );
  }
}