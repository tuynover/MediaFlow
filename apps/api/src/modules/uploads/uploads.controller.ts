import { Controller, Post, Get, Delete, Param, Body, Req, BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Controller('api/v1')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('projects/:projectId/uploads')
  async initiateUpload(@Req() request: any, @Param('projectId') projectId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    if (!body.filename || !body.sizeBytes) {
      throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'filename and sizeBytes are required' } });
    }
    return this.uploadsService.initiateUpload(workspaceId, projectId, body.filename, body.sizeBytes, body.mediaType || 'video/mp4');
  }

  @Get('uploads/:uploadId')
  async getUpload(@Req() request: any, @Param('uploadId') uploadId: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.uploadsService.getSession(workspaceId, uploadId);
  }

  @Post('uploads/:uploadId/parts/:partNumber/url')
  async signPartUrl(@Req() request: any, @Param('uploadId') uploadId: string, @Param('partNumber') partNumber: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.uploadsService.signPartUrl(workspaceId, uploadId, parseInt(partNumber, 10));
  }

  @Post('uploads/:uploadId/parts/report')
  async reportPart(@Req() request: any, @Param('uploadId') uploadId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.uploadsService.reportPart(workspaceId, uploadId, body.partNumber, body.etag, body.sizeBytes);
  }

  @Post('uploads/:uploadId/complete')
  async completeUpload(@Req() request: any, @Param('uploadId') uploadId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.uploadsService.completeUpload(workspaceId, uploadId, body.parts || []);
  }

  @Delete('uploads/:uploadId')
  async abortUpload(@Req() request: any, @Param('uploadId') uploadId: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.uploadsService.abortUpload(workspaceId, uploadId);
  }
}
