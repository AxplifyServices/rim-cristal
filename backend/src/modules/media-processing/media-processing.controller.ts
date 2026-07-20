import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  AuthGuard,
} from '../../common/auth/auth.guard';
import {
  Roles,
} from '../../common/auth/roles.decorator';
import {
  RolesGuard,
} from '../../common/auth/roles.guard';

import {
  MediaProcessingService,
} from './media-processing.service';

@Controller('admin/media-processing')
@UseGuards(
  AuthGuard,
  RolesGuard,
)
@Roles('admin')
export class MediaProcessingController {
  constructor(
    private readonly service:
      MediaProcessingService,
  ) {}

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }

  @Post('process-pending')
  processPending(
    @Query('limit')
    limit?: string,
  ) {
    return this.service.processPending(
      limit
        ? Number(limit)
        : undefined,
    );
  }

  @Post('retry-failed')
  retryFailed() {
    return this.service.retryFailed();
  }

  @Post('reset-stuck')
  resetStuck() {
    return this.service.resetStuckProcessing();
  }
}