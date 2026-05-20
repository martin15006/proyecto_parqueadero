import { Test, TestingModule } from '@nestjs/testing';
import { OperativoService } from './operativo.service';

describe('OperativoService', () => {
  let service: OperativoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OperativoService],
    }).compile();

    service = module.get<OperativoService>(OperativoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
