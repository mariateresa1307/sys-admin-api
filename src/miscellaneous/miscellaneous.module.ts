import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Miscellaneous } from './entities/miscellaneous.entity';
import { MiscellaneousService } from './miscellaneous.service';
import { MiscellaneousController } from './miscellaneous.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Miscellaneous])],
  controllers: [MiscellaneousController],
  providers: [MiscellaneousService],
  exports: [MiscellaneousService], // Exportado por si otro módulo necesita usarlo
})
export class MiscellaneousModule {}