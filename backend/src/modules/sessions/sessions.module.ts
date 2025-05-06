import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginHistory, LoginHistorySchema } from './schemas/login-history.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
  ],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
