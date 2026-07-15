import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Miscellaneous } from './entities/miscellaneous.entity';
import { MiscellaneousService } from './miscellaneous.service';
import { MiscellaneousController } from './miscellaneous.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Miscellaneous]),
  AuditModule],
  controllers: [MiscellaneousController],
  providers: [MiscellaneousService],
  exports: [MiscellaneousService],

})
export class MiscellaneousModule {}