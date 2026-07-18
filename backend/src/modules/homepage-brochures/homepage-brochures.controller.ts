import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/auth/auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { StorageService } from '../storage/storage.service';
import { HomepageBrochuresService } from './homepage-brochures.service';

@Controller('homepage-brochures')
export class HomepageBrochuresController {
  constructor(
    private readonly service: HomepageBrochuresService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Route publique utilisée par la page d'accueil.
   */
  @Get()
  findPublic() {
    return this.service.findPublic();
  }

  /**
   * Cette route doit rester avant @Get(':id'),
   * sinon "admin" serait interprété comme un identifiant.
   */
  @Get('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  /**
   * Upload d'une image desktop ou mobile.
   *
   * FormData :
   * file: fichier image
   */
  @Post('upload-image')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storageService.uploadHomepageBrochureImage(
      file,
    );
  }

  /**
   * Réorganisation de plusieurs brochures.
   *
   * Cette route doit rester avant @Put(':id').
   */
  @Post('reorder')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  reorder(@Body() body: any) {
    return this.service.reorder(body);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  findById(@Param('id') id: string) {
    return this.service.findById(Number(id));
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  create(
    @Body() body: any,
    @Req() request: any,
  ) {
    return this.service.create(
      body,
      request.user,
    );
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(
      Number(id),
      body,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}