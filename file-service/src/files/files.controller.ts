import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { pipeline } from 'stream/promises';
import { AuthenticatedUser, UserRole } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TokenService } from '../auth/token.service';
import {
  DeleteFileResponseDto,
  FileResponseDto,
  PaginatedFilesResponseDto,
} from './dto/file-response.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileCategory, isPublicCategory } from './file-category';
import { FilesService } from './files.service';
import { StoredFile } from './schemas/stored-file.schema';
import { UPLOAD_FIELD_NAME, UploadFileInterceptor } from './upload-file.interceptor';

const PUBLIC_CACHE_CONTROL = 'public, max-age=86400';
const PRIVATE_CACHE_CONTROL = 'private, no-store';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [UPLOAD_FIELD_NAME, 'category'],
      properties: {
        [UPLOAD_FIELD_NAME]: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: Object.values(FileCategory) },
        ownerUserId: { type: 'string', nullable: true },
      },
    },
  })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiBadRequestResponse({ description: 'FILE_REQUIRED | FILE_TOO_LARGE | FILE_TYPE_NOT_ALLOWED' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'CATEGORY_NOT_ALLOWED_FOR_ROLE' })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(UploadFileInterceptor)
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FileResponseDto> {
    return this.filesService.upload(file, dto, user);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List files (HR and SUPERADMIN only)' })
  @ApiOkResponse({ type: PaginatedFilesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: ListFilesQueryDto): Promise<PaginatedFilesResponseDto> {
    return this.filesService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get file metadata',
    description: 'PHOTO and LOGO are public. PASSPORT and DOCUMENT require a bearer token or ?token= query.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'token', required: false, description: 'Access token alternative to the Authorization header' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  getMetadata(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
  ): Promise<FileResponseDto> {
    const user = this.resolveOptionalUser(request);
    return this.filesService.getMetadata(id, user);
  }

  @Get(':id/content')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stream file content',
    description: 'PHOTO and LOGO are public. PASSPORT and DOCUMENT require a bearer token or ?token= query.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'token', required: false, description: 'Access token alternative to the Authorization header' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ description: 'Binary file content' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getContent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const user = this.resolveOptionalUser(request);
    const { file, stream } = await this.filesService.getContent(id, user);

    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', this.buildInlineDisposition(file.originalName));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Cache-Control',
      isPublicCategory(file.category) ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL,
    );

    await pipeline(stream, response);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Soft-delete a file and remove it from storage' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: DeleteFileResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DeleteFileResponseDto> {
    await this.filesService.softDelete(id);
    return { success: true };
  }

  private resolveOptionalUser(request: Request): AuthenticatedUser | null {
    const token = this.tokenService.extractOptionalToken(request);
    return this.tokenService.tryVerifyAccessToken(token);
  }

  private buildInlineDisposition(originalName: StoredFile['originalName']): string {
    const asciiFallback = originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const encoded = encodeURIComponent(originalName).replace(/['()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
  }
}
