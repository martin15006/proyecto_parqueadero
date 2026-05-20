import { Test, TestingModule } from '@nestjs/testing';
import { OperativoController } from './operativo.controller';

describe('OperativoController', () => {
  let controller: OperativoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperativoController],
    }).compile();

    controller = module.get<OperativoController>(OperativoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
