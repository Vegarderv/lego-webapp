//@flow
import { Component, useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  useStripe,
  useElements,
  PaymentRequestButtonElement,
  Elements,
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
} from '@stripe/react-stripe-js';
import config from 'app/config';
import stripeStyles from './Stripe.css';
import type { EventRegistrationPaymentStatus, User, Event } from 'app/models';
import LoadingIndicator from 'app/components/LoadingIndicator';

type Stripe = {
  paymentRequest: (Object) => Object,
  handleCardPayment: (string, ?Object) => Promise<*>,
  confirmPaymentIntent: (string, Object) => Promise<*>,
};
type Props = {
  event: Event,
  currentUser: User,
  createPaymentIntent: () => Promise<*>,
  paymentStatus: EventRegistrationPaymentStatus,
  clientSecret?: string,
  paymentError?: string,
};

type FormProps = Props & {
  fontSize?: string,
};

type CardFormProps = FormProps & {
  ledgend: string,
  setError: (string) => void,
  setSuccess: () => void,
  setLoading: (boolean) => void,
};

type PaymentRequestFormProps = FormProps & {
  setError: (string) => void,
  setSuccess: () => void,
  setLoading: (boolean) => void,
  setCanPaymentRequest: (boolean) => void,
};

type FormState = {
  error?: string | null,
  success?: boolean,
  loading: boolean,
  paymentRequest: boolean,
};

// See https://stripe.com/docs/js/appendix/payment_response#payment_response_object-complete
// for the statuses
type CompleteStatus =
  | 'success'
  | 'fail'
  | 'invalid_payer_name'
  | 'invalid_payer_phone'
  | 'invalid_payer_email'
  | 'invalid_shipping_address';

const StripeElementStyle = {
  style: {
    base: {
      color: '#424770',
      letterSpacing: '0.025em',
      fontFamily: 'Source Code Pro, monospace',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const CardForm = (props: CardFormProps) => {
  const [paymentStarted, setPaymentStarted] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const {
    clientSecret,
    createPaymentIntent,
    setError,
    setSuccess,
    setLoading,
    currentUser,
  } = props;

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (stripe) {
      clientSecret || createPaymentIntent();
      setLoading(true);
      setPaymentStarted(true);
    }
  };

  const completePayment = useCallback(
    async (clientSecret) => {
      setPaymentStarted(false);
      const card = elements.getElement(CardNumberElement);
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            email: currentUser.email,
            name: currentUser.fullName,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess();
      }
      setLoading(false);
    },
    [stripe, elements, currentUser, setError, setSuccess, setLoading]
  );

  useEffect(() => {
    if (clientSecret && paymentStarted) {
      completePayment(clientSecret);
    }
  }, [clientSecret, paymentStarted, completePayment]);

  return stripe && elements ? (
    <form style={{ width: '100%' }} onSubmit={handleSubmit}>
      <fieldset className={stripeStyles.elementsFieldset}>
        <legend className={stripeStyles.elementsLedgend}>
          {props.ledgend}
        </legend>
        <label className={stripeStyles.StripeLabel}>
          Kortnummer
          <CardNumberElement
            className={stripeStyles.StripeElement}
            options={StripeElementStyle}
          />
        </label>
        <label className={stripeStyles.StripeLabel}>
          Utløpsdato
          <CardExpiryElement
            className={stripeStyles.StripeElement}
            options={StripeElementStyle}
          />
        </label>
        <label className={stripeStyles.StripeLabel}>
          CVC
          <CardCvcElement
            className={stripeStyles.StripeElement}
            options={StripeElementStyle}
          />
        </label>
        <button className={stripeStyles.StripeButton}>Betal</button>
      </fieldset>
    </form>
  ) : (
    <LoadingIndicator loading />
  );
};

const PaymentRequestForm = (props: PaymentRequestFormProps) => {
  const [complete, setComplete] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const stripe = useStripe();

  const {
    event,
    paymentError,
    clientSecret,
    createPaymentIntent,
    setError,
    setSuccess,
    setLoading,
    setCanPaymentRequest,
  } = props;

  const completePayment = useCallback(
    async (clientSecret) => {
      if (!complete || !paymentMethod) {
        return;
      }

      const { error: confirmError } = await stripe.confirmPaymentIntent(
        clientSecret,
        {
          payment_method: paymentMethod.id,
        }
      );
      if (confirmError) {
        complete('fail');
        return;
      }
      complete('success');
      setLoading(true);

      const { error } = await stripe.handleCardPayment(clientSecret);
      if (error) {
        setError(error.message);
      } else {
        setSuccess();
      }
      setLoading(false);
    },
    [stripe, complete, paymentMethod, setError, setSuccess, setLoading]
  );

  const completePaymentManual = useCallback(
    async (status: CompleteStatus) => {
      if (!complete) {
        return;
      }

      complete(status);

      if (status === 'success') {
        setSuccess();
      }
    },
    [complete, setSuccess]
  );

  useEffect(() => {
    if (!paymentRequest && stripe && event) {
      const paymentReq = stripe.paymentRequest({
        currency: 'nok',
        total: {
          label: event.title,
          amount: event.price,
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        country: 'NO',
      });

      paymentReq.on('paymentmethod', async ({ paymentMethod, complete }) => {
        setComplete(() => complete);
        setPaymentMethod(paymentMethod);
        if (clientSecret) {
          completePayment(clientSecret);
        } else {
          createPaymentIntent();
        }
      });

      paymentReq.canMakePayment().then((result) => {
        setCanMakePayment(!!result);
        setCanPaymentRequest(!!result);
      });

      setPaymentRequest(paymentReq);
    }
  }, [
    paymentRequest,
    clientSecret,
    stripe,
    event,
    completePayment,
    createPaymentIntent,
    setCanPaymentRequest,
  ]);

  useEffect(() => {
    if (clientSecret && completePayment && !paymentStarted) {
      setPaymentStarted(true);
      completePayment(clientSecret);
    }
  }, [clientSecret, completePayment, paymentStarted, completePaymentManual]);

  useEffect(() => {
    return () => {
      completePaymentManual('fail');
    };
  }, []);

  useEffect(() => {
    if (paymentError && setError && completePaymentManual) {
      completePaymentManual('fail');
      setError(paymentError);
    }
  }, [paymentError, completePaymentManual, setError]);

  return (
    <div style={{ flex: 1 }}>
      {canMakePayment && paymentRequest && (
        <PaymentRequestButtonElement
          onClick={(e) => {
            if (paymentMethod) {
              e.preventDefault();
              setError(
                'Det skjedde en feil under prosesseringen av betalingen. Vennligst refresh siden for å prøve igjen.'
              );
            }
          }}
          paymentRequest={paymentRequest}
          className={stripeStyles.PaymentRequestButton}
          options={{
            style: {
              paymentRequestButton: {
                height: '41px',
              },
            },
            paymentRequest,
          }}
        />
      )}
    </div>
  );
};

const stripePromise = loadStripe(config.stripeKey);

class PaymentForm extends Component<FormProps, FormState> {
  state = {
    loading: false,
    paymentRequest: false,
    error: null,
    success: false,
  };

  setSuccess = () => this.setState({ success: true });

  setError = (error: string) => this.setState({ error });

  setLoading = (loading: boolean) => {
    this.setState({ loading });
    loading && this.setState({ error: null });
  };

  setPaymentRequest = (paymentRequest: boolean) =>
    this.setState({ paymentRequest });

  render() {
    const { success, error, loading } = this.state;
    return success ? (
      <div className={stripeStyles.success}>
        {`Din betaling på ${
          this.props.event.price
            ? (this.props.event.price / 100).toFixed(2).replace('.', ',')
            : ''
        } kr ble godkjent.`}
      </div>
    ) : (
      <>
        {loading && <LoadingIndicator loading />}
        {error && <div className={stripeStyles.error}>{error}</div>}
        <div style={{ display: loading ? 'none' : 'block' }}>
          <Elements stripe={stripePromise}>
            <PaymentRequestForm
              {...this.props}
              setSuccess={() => this.setSuccess()}
              setError={(error) => this.setError(error)}
              setLoading={(loading) => this.setLoading(loading)}
              setCanPaymentRequest={(paymentRequest) =>
                this.setPaymentRequest(paymentRequest)
              }
            />
            <CardForm
              {...this.props}
              fontSize="18px"
              setSuccess={() => this.setSuccess()}
              setError={(error) => this.setError(error)}
              setLoading={(loading) => this.setLoading(loading)}
              ledgend={
                this.state.paymentRequest
                  ? 'Eller skriv inn kortinformasjon'
                  : 'Skriv inn kortinformasjon'
              }
            />
          </Elements>
        </div>
      </>
    );
  }
}

export default PaymentForm;
