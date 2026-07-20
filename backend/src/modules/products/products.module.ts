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
  ProductsController,
} from './products.controller';

import {
  ProductsService,
} from './products.service';

@Module({
  imports: [
    AuthModule,
    MediaProcessingModule,
  ],

  controllers: [
    ProductsController,
  ],

  providers: [
    ProductsService,
  ],
})
export class ProductsModule {}