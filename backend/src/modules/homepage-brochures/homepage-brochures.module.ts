import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module';

import {
  MediaProcessingModule,
} from '../media-processing/media-processing.module';

import {
  HomepageBrochuresController,
} from './homepage-brochures.controller';

import {
  HomepageBrochuresService,
} from './homepage-brochures.service';

@Module({
  imports: [
    AuthModule,
    MediaProcessingModule,
  ],

  controllers: [
    HomepageBrochuresController,
  ],

  providers: [
    HomepageBrochuresService,
  ],

  exports: [
    HomepageBrochuresService,
  ],
})
export class HomepageBrochuresModule {}