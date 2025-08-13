type Observer<T> = {
  next: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
};

class MyObservable<T> {
  constructor(private producerFn: (observer: Observer<T>) => void) {}

  subscribe(observer: Observer<T>) {
    this.producerFn(observer);  // ⬅️ here's where "observer" gets passed in
  }
}



const obs = new MyObservable<string>((observer) => {
  observer.next('A');
  observer.next('B');
});


obs.subscribe({
  next: (val) => console.log(val)
});


const obs2 = new MyObservable<number>((observer) => {
  observer.next(2);
  observer.next(3);
});

obs2.subscribe(
  {
    next : (val) => console.log(val)
  }
)


const array = ['Sina','Quin', 'Ben', 'Zoe']

array.filter(x => x[0] === 'Q')

array.filter((value : string,) => value ==="Jordan");




function myFilter<T>(array : T[], predicate : (val : T , index : number , array : T[])=> boolean) : T[]
  {
    const result = [];

    for (let index = 0; index < array.length; index++)
    {
      const value = array[index];

      if(predicate(value , index , array))
          result.push(value);

    }

    return result;
  }
  const newarray = myFilter(array , (x => x[0]!== 'Q'));

function myFind<T>(array : T[], predicate : (value : T, index : number, array : T[]) => boolean) : T | null
{
  for (let index = 0; index < array.length; index++) {
    const element = array[index];

    if(predicate(element, index, array))
    {
      return element;
    }
  }
  return null;

}




