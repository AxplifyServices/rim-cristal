import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module';

import {
  MediaProcessingController,
} from './media-processing.controller';

import {
  MediaProcessingService,
} from './media-processing.service';

import {
  MediaRegistryService,
} from './media-registry.service';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    MediaProcessingController,
  ],

  providers: [
    MediaProcessingService,
    MediaRegistryService,
  ],

  exports: [
    MediaProcessingService,
    MediaRegistryService,
  ],
})
export class MediaProcessingModule {}