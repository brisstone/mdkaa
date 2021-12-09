import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../index';

chai.use(chaiHttp);
const { expect } = chai;

const validID = 8;
const invalidID = 7000;

/**
 * @description Test for countries endpoint
 */
describe('Countries', () => {
  it('Should fetch all countries', done => {
    chai
      .request(app)
      .get('/api/v1/country')
      .end((err, res) => {
        expect(res.body)
          .to.have.property('status')
          .eql('success');
        expect(res.body).to.have.property('data');
        expect(res.status).to.equal(200);
        done();
      });
  });

  it('Should get a single country by the ID', done => {
    chai
      .request(app)
      .get(`/api/v1/country/${validID}`)
      .end((err, res) => {
        expect(res.body)
          .to.have.property('status')
          .eql('success');
        expect(res.body).to.have.property('data');
        expect(res.status).to.equal(200);
        done();
      });
  });

  it('Should return a message if in invalid or unavalable ID is requested', done => {
    chai
      .request(app)
      .get(`/api/v1/country/${invalidID}`)
      .end((err, res) => {
        expect(res.status).to.equal(204);
        done();
      });
  });
});
