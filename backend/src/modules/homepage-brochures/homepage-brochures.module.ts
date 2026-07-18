import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HomepageBrochuresController } from './homepage-brochures.controller';
import { HomepageBrochuresService } from './homepage-brochures.service';

@Module({
  imports: [AuthModule],
  controllers: [HomepageBrochuresController],
  providers: [HomepageBrochuresService],
  exports: [HomepageBrochuresService],
})
export class HomepageBrochuresModule {}